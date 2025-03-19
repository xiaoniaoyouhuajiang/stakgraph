package com.kotlintestapp.models

data class Person(
    val id: Int,
    val owner_alias: String,
    val img: String,
    val owner_pubkey: String,
    val owner_route_hint: String
)